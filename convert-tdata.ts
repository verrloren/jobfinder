/**
 * Converts a TDATA (tdesktop) folder to a GramJS session.
 * Needs GramJS installed (npm i telegram)
 *
 * This is all based on https://github.com/danog/MadelineProto/blob/master/src/danog/MadelineProto/Conversion.php from the madeline library
 * and as such is distributed in the same license and with the same header
 *
 * onversion module.
 *
 * This file is part of MadelineProto.
 * MadelineProto is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 * MadelineProto is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 * You should have received a copy of the GNU General Public License along with MadelineProto.
 * If not, see <http://www.gnu.org/licenses/>.
 *
 * @author    Daniil Gentili <daniil@daniil.it>
 * @copyright 2016-2020 Daniil Gentili <daniil@daniil.it>
 * @license   https://opensource.org/licenses/AGPL-3.0 AGPLv3
 *
 * @link https://docs.madelineproto.xyz MadelineProto documentation
 */

import * as crypto from "crypto";
import * as fs from "fs";
import { BinaryReader } from "telegram/extensions";
import { IGE } from "telegram/crypto/IGE";
import { AuthKey } from "telegram/crypto/AuthKey";
import { StringSession } from "telegram/sessions";

function tdesktop_md5(data: string) {
    let result = '';
    const hash = crypto.createHash('md5').update(data).digest("hex");
    for (let i = 0; i < hash.length; i += 2) {
        result += hash[i + 1] + hash[i];
    }
    return result.toUpperCase();
}

function tdesktop_readBuffer(file: BinaryReader) {
    let length = file.read(4).reverse().readInt32LE();
    return length > 0 ? file.read(length, false) : Buffer.alloc(0);
}

function sha1(buf: Buffer) {
    return crypto.createHash('sha1').update(buf).digest()
}

/**
 * Old way of calculating aes keys
 */
function _calcKey(authKey: Buffer, msgKey: Buffer, client: boolean) {
    const x = client ? 0 : 8;
    const sha1_a = sha1(Buffer.concat([msgKey, authKey.slice(x, x + 32)]));
    const sha1_b = sha1(Buffer.concat([authKey.slice(32 + x, 32 + x + 16), msgKey, authKey.slice(48 + x, 48 + x + 16)]));
    const sha1_c = sha1(Buffer.concat([authKey.slice(64 + x, 64 + x + 32), msgKey]));
    const sha1_d = sha1(Buffer.concat([msgKey, authKey.slice(96 + x, 96 + x + 32)]));

    const aes_key = Buffer.concat([sha1_a.slice(0, 8), sha1_b.slice(8, 8 + 12), sha1_c.slice(4, 4 + 12)]);
    const aes_iv = Buffer.concat([sha1_a.slice(8, 8 + 12), sha1_b.slice(0, 8), sha1_c.slice(16, 16 + 4), sha1_d.slice(0, 8)]);

    return [aes_key, aes_iv];
}


function tdesktop_decrypt(data: BinaryReader, auth_key: Buffer): BinaryReader {
    const message_key = data.read(16);
    const encrypted_data = data.read();
    const [aes_key, aes_iv] = _calcKey(auth_key, message_key, false);
    const ige = new IGE(aes_key, aes_iv);
    const decrypted_data = ige.decryptIge(encrypted_data) as Buffer;

    if (message_key.toString("hex") != sha1(decrypted_data).slice(0, 16).toString("hex")) {
        throw new Error('msg_key mismatch');
    }
    return new BinaryReader(decrypted_data);
}

function tdesktop_open_encrypted(fileName: string, tdesktop_key: Buffer) {
    const f = tdesktop_open(fileName);
    const data = tdesktop_readBuffer(f);
    const res = tdesktop_decrypt(new BinaryReader(data), tdesktop_key);
    const length = res.readInt(false);
    if (length > res.getBuffer().length || length < 4) {
        throw new Error('Wrong length');
    }
    return res;
}

function tdesktop_open(name: string): BinaryReader {
    const filesToTry: BinaryReader[] = [];
    for (const i of ['0', '1', 's']) {
        if (fs.existsSync(name + i)) {
            filesToTry.push(new BinaryReader(fs.readFileSync(name + i)));
        }
    }

    for (const fileToTry of filesToTry) {
        const magic = fileToTry.read(4).toString("utf-8");
        if (magic != "TDF$") {
            console.error("WRONG MAGIC");
            continue;
        }
        const versionBytes = fileToTry.read(4);
        const version = versionBytes.readInt32LE(0);

        console.error(`TDesktop version: ${version}`);
        let data = fileToTry.read();
        const md5 = data.slice(-16).toString("hex");
        data = data.slice(0, -16);
        const length = Buffer.alloc(4);
        length.writeInt32LE(data.length, 0);
        const toCompare = Buffer.concat([data, length, versionBytes, Buffer.from("TDF$", "utf-8")]);
        const hash = crypto.createHash('md5').update(toCompare).digest("hex");
        if (hash != md5) {
            throw new Error("Wrong MD5");
        }
        return new BinaryReader(data)
    }
    throw new Error("Could not open " + name)
}

function getServerAddress(dcId: number) {
    switch (dcId) {
        case 1:
            return "149.154.175.55";
        case 2:
            return "149.154.167.50";
        case 3:
            return "149.154.175.100";
        case 4:
            return "149.154.167.91";
        case 5:
            return "91.108.56.170";
        default:
            throw new Error("Invalid DC");
    }
}

async function main(TDATA_PATH: string) {
    const old_session_key = 'data';
    const part_one_md5 = tdesktop_md5(old_session_key).slice(0, 16);
    const tdesktop_user_base_path = TDATA_PATH + "/" + part_one_md5;
    const path_key = 'key_' + old_session_key;
    const data = tdesktop_open(TDATA_PATH + "/" + path_key);
    const salt = tdesktop_readBuffer(data);
    if (salt.length !== 32) {
        throw new Error("Length of salt is wrong!");
    }
    const encryptedKey = tdesktop_readBuffer(data);
    const encryptedInfo = tdesktop_readBuffer(data);
    const hash = crypto.createHash('sha512').update(salt).update('').update(salt).digest();
    const passKey = crypto.pbkdf2Sync(hash, salt, 1, 256, "sha512");
    const key = tdesktop_readBuffer(tdesktop_decrypt(new BinaryReader(encryptedKey), passKey));
    const info = tdesktop_readBuffer(tdesktop_decrypt(new BinaryReader(encryptedInfo), key));
    const count = info.readUInt32BE();
    console.log("Accounts count", count);
    if (count !== 1) {
        throw new Error("Currently only supporting one account at a time");
    }
    let main = tdesktop_open_encrypted(tdesktop_user_base_path, key);
    const magic = main.read(4).reverse().readUInt32LE();
    if (magic != 75) {
        throw new Error("Unsupported magic version");
    }
    const final = new BinaryReader(tdesktop_readBuffer(main));

    final.read(12);
    const userId = final.read(4).reverse().readUInt32LE();
    console.log("User ID is ", userId);
    const mainDc = final.read(4).reverse().readUInt32LE();
    console.log("Main DC is ", mainDc);
    const length = final.read(4).reverse().readUInt32LE();
    const mainAuthKey = new AuthKey();
    for (let i = 0; i < length; i++) {
        const dc = final.read(4).reverse().readUInt32LE();
        const authKey = final.read(256);
        if (dc == mainDc) {
            await mainAuthKey.setKey(authKey);
            const session = new StringSession("");
            session.setDC(
                mainDc,
                getServerAddress(mainDc),
                443,
            );
            session.setAuthKey(mainAuthKey);

            console.log("Session is");
            const sessionString = session.save();
            console.log(sessionString);
            return sessionString;
        }
    }

}

// uncomment this line if you want to run it here.
// use your own path
main("/home/dan/code/projects/autoapply_tg_bot/data/account_tg_1/tdata");
