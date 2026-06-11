use crate::state::{Player, Room};
use anchor_lang::prelude::*;

pub fn load_room(info: &AccountInfo) -> Result<Room> {
    let data = info.try_borrow_data()?;
    let mut slice: &[u8] = &data[8..];
    Room::try_deserialize(&mut slice).map_err(Into::into)
}

pub fn save_room(info: &AccountInfo, room: &Room) -> Result<()> {
    let mut data = info.try_borrow_mut_data()?;
    let mut writer: &mut [u8] = &mut data[8..];
    room.try_serialize(&mut writer)?;
    Ok(())
}

pub fn with_player_mut<F>(acc: &AccountInfo, f: F) -> Result<()>
where
    F: FnOnce(&mut Player) -> Result<()>,
{
    let mut data = acc.try_borrow_mut_data()?;
    let mut slice: &[u8] = &data[8..];
    let mut player = Player::try_deserialize(&mut slice)?;
    f(&mut player)?;
    let mut writer: &mut [u8] = &mut data[8..];
    player.try_serialize(&mut writer)?;
    Ok(())
}

pub fn read_player(acc: &AccountInfo) -> Result<Player> {
    let data = acc.try_borrow_data()?;
    let mut slice: &[u8] = &data[8..];
    Player::try_deserialize(&mut slice).map_err(Into::into)
}
